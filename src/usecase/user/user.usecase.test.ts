import { UpdateUserRequest } from "../../handler/http/user/user.http.entity.js";
import { Nullable, PromiseSafe } from "../../pkg/safecatch/safecatch.type.js";
import { UserRepositoryMock } from "../../repo/user/user.repo.mock.js";
import { UserUsecase } from "./user.usecase.js";
import { Config } from "../../config/config.entity.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { UserEntity } from "../../repo/user/user.repo.entity.js";

class UserUsecaseMock {
    constructor(public UserRepo: UserRepositoryMock = new UserRepositoryMock()) {}

    toUsecase(): UserUsecase {
        return new UserUsecase(Obj.make(Config, {}), new Logger(), this.UserRepo)
    }
}

describe("UserUsecase.updateUser()", () => {
    interface Test {
        name: string
        input: UpdateUserRequest
        mock: () => UserUsecaseMock
        wantErr: boolean 
    }

    const tests: Test[] = [
        {
            name: "failed to get user",
            input: Obj.make(UpdateUserRequest, {}),
            mock: (): UserUsecaseMock => {
                const mock = new UserUsecaseMock()
                mock.UserRepo.get = async (_: number): PromiseSafe<Nullable<UserEntity>> => {
                    return new AppError("error")
                }
                return mock
            },
            wantErr: true
        }
    ] 

    for(const test of tests) {
        const mock = test.mock()
        const uc = mock.toUsecase()

        it(test.name, async () => {
            const res = await uc.updateUser(test.input)
            expect(res instanceof AppError).toBe(test.wantErr)
        })
    }
})