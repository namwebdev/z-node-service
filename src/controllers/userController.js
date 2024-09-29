// Author: TrungQuanDev | https://youtube.com/@trungquandev
import { StatusCodes } from "http-status-codes";
import { pickUser } from "~/utils/formatters";
import { authenticator } from "otplib";
import qrCode from "qrcode";
const Datastore = require("nedb-promises");

// LƯU Ý: Trong ví dụ về xác thực 2 lớp Two-Factor Authentication (2FA) này thì chúng ta sẽ sử dụng nedb-promises để lưu và truy cập dữ liệu từ một file JSON. Coi như file JSON này là Database của dự án.
const UserDB = Datastore.create("src/database/users.json");
const twoFactorSecretDB = Datastore.create(
  "src/database/twoFactorSecrets.json"
);
const UserSessionDB = Datastore.create("src/database/user_sessions.json");

const SERVICE_NAME = "NodeAPI - 2FA";

const login = async (req, res) => {
  try {
    const user = await UserDB.findOne({ email: req.body.email });
    // Không tồn tại user
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found!" });
      return;
    }
    // Kiểm tra mật khẩu "đơn giản". LƯU Ý: Thực tế phải dùng bcryptjs để hash mật khẩu, đảm bảo mật khẩu được bảo mật. Ở đây chúng ta làm nhanh gọn theo kiểu so sánh string để tập trung vào nội dung chính là 2FA.
    // Muốn học về bcryptjs cũng như toàn diện kiến thức đầy đủ về việc làm một trang web Nâng Cao thì các bạn có thể theo dõi khóa MERN Stack Advanced này. (Public lên phần hội viên của kênh vào tháng 12/2024)
    // https://www.youtube.com/playlist?list=PLP6tw4Zpj-RJbPQfTZ0eCAXH_mHQiuf2G
    if (user.password !== req.body.password) {
      res
        .status(StatusCodes.NOT_ACCEPTABLE)
        .json({ message: "Wrong password!" });
      return;
    }

    res.status(StatusCodes.OK).json(pickUser(user));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const getUser = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id });
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found!" });
      return;
    }
    const session = await _getUserSession(user._id, req.headers["user-agent"]);

    res.status(StatusCodes.OK).json({
      ...pickUser(user),
      is_2fa_verified: session?.is_2fa_verified || false,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const logout = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id });
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found!" });
      return;
    }

    const device_id = req.headers["user-agent"];
    const session = await _getUserSession(user._id, device_id);
    if (!session)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Session not found!" });

    await UserSessionDB.remove({ _id: session._id, device_id: device_id });
    UserSessionDB.compactDatafileAsync();

    res.status(StatusCodes.OK).json({})
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const get2FAQRCode = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id });
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found!" });
    }

    let twoFactorSecretKeyVal = null;
    const twoFactorSecretKey = await twoFactorSecretDB.findOne({
      user_id: user._id,
    });
    if (!twoFactorSecretKey) {
      const newTwoFactorSecretKey = await twoFactorSecretDB.insert({
        user_id: user._id,
        value: authenticator.generateSecret(),
      });
      twoFactorSecretKeyVal = newTwoFactorSecretKey.value;
    } else {
      twoFactorSecretKeyVal = twoFactorSecretKey.value;
    }

    const otpToken = authenticator.keyuri(
      user.username,
      SERVICE_NAME,
      twoFactorSecretKeyVal
    );
    const qrCodeImageUrl = await qrCode.toDataURL(otpToken);

    res.status(StatusCodes.OK).json({ code: qrCodeImageUrl });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const setup2FA = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id });
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found!" });
    }

    const twoFactorSecretKey = await twoFactorSecretDB.findOne({
      user_id: user._id,
    });
    if (!twoFactorSecretKey) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Two factor key not found!" });
    }

    const otpToken = req.body.otpToken;
    if (!otpToken) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "OTP token is required!" });
    }

    const isValid = authenticator.verify({
      token: otpToken,
      secret: twoFactorSecretKey.value,
    });
    if (!isValid) {
      return res
        .status(StatusCodes.NOT_ACCEPTABLE)
        .json({ message: "Invalid OTP token!" });
    }

    await UserDB.update(
      { _id: user._id },
      { $set: { require_2fa: true } },
      {
        returnUpdatedDocs: true,
      }
    );
    UserDB.compactDatafileAsync();

    const newUserSession = await UserSessionDB.insert({
      user_id: user._id,
      device_id: req.headers["user-agent"],
      last_login: new Date().valueOf(),
      is_2fa_verified: true,
    });
    res.status(StatusCodes.OK).json({
      ...pickUser(user),
      is_2fa_verified: true,
      require_2fa: true,
      last_login: newUserSession.last_login,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const verify2FA = async (req, res) => {
  try {
    const user = await UserDB.findOne({ _id: req.params.id });
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found!" });
    }

    const twoFactorSecretKey = await twoFactorSecretDB.findOne({
      user_id: user._id,
    });
    if (!twoFactorSecretKey) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Two factor key not found!" });
    }

    const otpToken = req.body.otpToken;
    if (!otpToken) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "OTP token is required!" });
    }

    const isValid = authenticator.verify({
      token: otpToken,
      secret: twoFactorSecretKey.value,
    });
    if (!isValid) {
      return res
        .status(StatusCodes.NOT_ACCEPTABLE)
        .json({ message: "Invalid OTP token!" });
    }

    const currentUserSession = await UserSessionDB.findOne({
      user_id: user._id,
      device_id: req.headers["user-agent"],
    });
    currentUserSession
      ? await UserSessionDB.update(
          {
            user_id: user._id,
            device_id: req.headers["user-agent"],
          },
          {
            $set: {
              is_2fa_verified: true,
            },
          },
          { returnUpdatedDocs: true }
        )
      : await UserSessionDB.insert({
          user_id: user._id,
          device_id: req.headers["user-agent"],
          last_login: new Date().valueOf(),
          is_2fa_verified: true,
        });
    UserSessionDB.compactDatafileAsync();

    res.status(StatusCodes.OK).json({
      ...pickUser(user),
      is_2fa_verified: true,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

const _getUserSession = async (userId, deviceId) => {
  const data = await UserSessionDB.findOne({
    user_id: userId,
    device_id: deviceId,
  });
  if (!data) return null;

  return data;
};

export const userController = {
  login,
  getUser,
  logout,
  get2FAQRCode,
  setup2FA,
  verify2FA,
};
